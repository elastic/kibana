# Lens Demo Instance Setup

This describes how to set up a simple demo server which pulls a branch periodically, builds it and deploys it.
Security is done by a reverse proxy with a single password.

There are a lot of rough edges, this isn't expected to be a generic way to do this.

Steps to setup

* Create new debian VM instance in GCP (>8GB of RAM and 100GB of disk space)
* Log into ssh
* `sudo apt-get install git`
* `git clone --depth=1 https://github.com/elastic/kibana.git`
* `cd kibana`
* `git remote set-branches origin '<MY_BRANCH>'`
* `git fetch --depth 1 origin <MY_BRANCH>`
* `git checkout <MY_BRANCH>`
* `curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash`
* `export NVM_DIR="$HOME/.nvm"`
* `[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm`
* `nvm install 10.15.2 # might change in the future`
* `npm install -g yarn`
* `yarn kbn bootstrap`
* `screen -S es -dm bash -c "yarn es snapshot"`
* `sudo apt-get install nginx`
* 
```sh
echo "server {\
    listen 80;\
    location / {\
        proxy_pass http://127.0.0.1:5601/;\
        auth_basic \"<MY DEMO SETUP>\";\
        auth_basic_user_file /home/<MY_USERNAME>/htpasswd;\
    }\
}" | sudo tee /etc/nginx/sites-available/default
```
* `echo "test:$apr1$K6K8nXW8$s/qN.k82Ib/Er6eMMz6gu/" > /home/<MY_USERNAME>/htpasswd` <- This is the password file, change password accordingly
* `sudo systemctl restart nginx`
* 
```sh
echo "cd /home/<MY_USERNAME>/kibana
git pull
yarn build --skip-archives --skip-os-packages --no-oss
screen -S kibana -X quit
rm -rf ../built_kibana
mv ./build/default/kibana-8.0.0-SNAPSHOT-linux-x86_64 ../built_kibana
cd ../built_kibana
screen -S kibana -dm bash -c \"./bin/kibana\"" >  /home/<MY_USERNAME>/build.sh
```
* `chmod +x /home/<MY_USERNAME>/build.sh`
* `/home/<MY_USERNAME>/build.sh`
* `crontab -e # 0 0 * * * /home/<MY_USERNAME>/build.sh`