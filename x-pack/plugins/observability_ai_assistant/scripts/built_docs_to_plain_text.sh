#!/bin/bash

# Input and output directories
INPUT_DIR="$(dirname "$0")/../../../../../built-docs/html/en/elasticsearch/reference/master"
OUTPUT_DIR="$(dirname "$0")/../server/service/kb_service/kb_docs/assets/esql"

compact() {
    local file="$1"

    # Use awk for multi-line pattern removal and subsequent tasks
    awk '
    
    /\| Elasticsearch Guide \[master\] \| Elastic/,/Elastic Docs ›Elasticsearch Guide \[master\] ›/ {
        sub(/\| Elasticsearch Guide \[master\] \| Elastic/, "");
        sub(/\You are looking at.*/, "");
        sub(/\what you want.*/, "");
        sub(/.*Elastic Docs ›Elasticsearch Guide \[master\] ›/, ""); 
        print;
        next; 
    } 
    /«/ {last_line = NR}
    {lines[NR] = $0} 
    END {for (i = 1; i < last_line; i++) print lines[i]}
    ' "$file" |

    # 3. Remove lines that start with « and end with ».
    sed '/^«.*»$/d' |

    # 4. Remove 'edit' occurrences
    sed 's/edit//g' |

    # 5. Remove all empty lines
    sed '/^$/d' > "${file}.tmp" && mv "${file}.tmp" "$file"
}

# Convert files from HTML to Markdown using pandoc
find "$INPUT_DIR" -type f -name "esql*.html" | while read -r file; do
    # Determine the output file name by replacing the source directory with the target directory
    # and changing the extension to .md
    outfile=$(echo "$file" | sed "s#$INPUT_DIR#$OUTPUT_DIR#g" | sed 's/\.html$/.txt/')

    # Create the directory structure for the output file if it doesn't exist
    outdir=$(dirname "$outfile")
    mkdir -p "$outdir"

    # Convert the file using pandoc
    pandoc -s "$file" -o "$outfile" -t plain

    compact $outfile

    echo "Converted $file to $outfile"
done
